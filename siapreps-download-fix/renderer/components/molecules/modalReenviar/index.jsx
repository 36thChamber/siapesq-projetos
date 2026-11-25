import React, { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { CSSTransition } from "react-transition-group";
import { enviarEmailDeVerificacao } from "../../../controllers/verificarEmail";

const ReenviarEmail = ({ show, handleClose }) => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState(false);
    const [confirma, setConfirma] = useState(false);

    const handleSend =  () => {
        enviarEmailDeVerificacao(email)
        .then((response)=> {
            setConfirma(true)
        }) .catch((error) =>{
            setError(true)
        })
    };
    const handleCloseConfirma = () => setConfirma(false);
    const handleCloseError = () => setError(false);
    return (
        <>
            <CSSTransition
                in={show}
                timeout={300}
                classNames="modal"
                unmountOnExit
            >
                <Modal show={show} onHide={handleClose} centered>
                    <Modal.Header closeButton>
                        <Modal.Title>Usuário não verificado!</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                    <Modal.Title style={{fontSize:'15px'}}>Verifique seu email para confirmar seu usuário.</Modal.Title>
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
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleClose}>
                            Fechar
                        </Button>
                        <Button variant="primary" onClick={handleSend}>
                            Reenviar e-mail
                        </Button>
                    </Modal.Footer>
                </Modal>
            </CSSTransition>
            <CSSTransition
            in={confirma}
            timeout={300}
            classNames="modal"
            unmountOnExit
        >
            <Modal show={confirma} onHide={handleCloseConfirma} centered>
                <Modal.Header closeButton>
                    <Modal.Title>E-mail Enviado!</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Modal.Title style={{ fontSize: '15px' }}>
                        Um e-mail de verificação foi enviado para o seu endereço. Por favor, verifique sua caixa de entrada.
                    </Modal.Title>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={handleCloseConfirma}>
                        Fechar
                    </Button>
                </Modal.Footer>
            </Modal>
        </CSSTransition>

        <CSSTransition
            in={error}
            timeout={300}
            classNames="modal"
            unmountOnExit
        >
            <Modal show={error} onHide={handleCloseError} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Erro ao Enviar E-mail!</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Modal.Title style={{ fontSize: '15px' }}>
                        Ocorreu um erro ao tentar enviar o e-mail de verificação. Por favor, tente novamente mais tarde.
                    </Modal.Title>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={handleCloseError}>
                        Fechar
                    </Button>
                </Modal.Footer>
            </Modal>
        </CSSTransition>
     </>
    );
};

export default ReenviarEmail;
