import React, { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { CSSTransition } from "react-transition-group";
import { esqueciSenha } from '../../../controllers/esqueceuSenha';

const EsqueceuSenha = ({ show, handleClose }) => {
    const [email, setEmail] = useState('');
    const [emailSent, setEmailSent] = useState(false); // Estado para controlar se o e-mail foi enviado com sucesso

    const handleSend = async () => {
        try {
            await esqueciSenha(email);
            setEmailSent(true); // Define o estado de e-mail enviado como verdadeiro após o sucesso
        } catch (error) {
            console.error('Erro ao enviar e-mail:', error);
            // Tratar erros de envio de e-mail, se necessário
        }
    };

    const handleResetState = () => {
        setEmail('');
        setEmailSent(false); // Reseta o estado quando fechar o modal de confirmação
        handleClose(); // Fecha o modal principal
    };

    return (
        <CSSTransition
            in={show}
            timeout={300}
            classNames="modal"
            unmountOnExit
        >
            <Modal show={show} onHide={handleResetState} centered>
                <Modal.Header closeButton={!emailSent}>
                    <Modal.Title>{emailSent ? 'E-mail Enviado!' : 'Esqueceu sua senha.'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {emailSent ? (
                        <p>O e-mail para alteração de senha foi enviado com sucesso para {email}.</p>
                    ) : (
                        <>
                            <p style={{ fontSize: '15px' }}>Digite o e-mail para alterar sua senha.</p>
                            <Form>
                                <Form.Group controlId="formEmail">
                                    <Form.Label>Email</Form.Label>
                                    <Form.Control
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Digite seu email..."
                                    />
                                </Form.Group>
                            </Form>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleResetState}>
                        Fechar
                    </Button>
                    {!emailSent && (
                        <Button variant="primary" onClick={handleSend}>
                            Enviar
                        </Button>
                    )}
                </Modal.Footer>
            </Modal>
        </CSSTransition>
    );
};

export default EsqueceuSenha;
